import { expect, haveResource,  } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/cdk';
import { Test } from 'nodeunit';
import { VpcNetwork } from '../lib';

export = {
  'can add a vpn connection to a vpc with a vpn gateway'(test: Test) {
    // GIVEN
    const stack = new Stack();

    // WHEN
    new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          asn: 65001,
          ip: '192.0.2.1'
        }
      }
    });

    // THEN
    expect(stack).to(haveResource('AWS::EC2::CustomerGateway', {
      BgpAsn: 65001,
      IpAddress: '192.0.2.1',
      Type: 'ipsec.1'
    }));

    expect(stack).to(haveResource('AWS::EC2::VPNConnection', {
      CustomerGatewayId: {
        Ref: 'VpcNetworkVpnConnectionCustomerGateway8B56D9AF'
      },
      Type: 'ipsec.1',
      VpnGatewayId: {
        Ref: 'VpcNetworkVpnGateway501295FA'
      },
      StaticRoutesOnly: false,
    }));

    test.done();
  },

  'with static routing'(test: Test) {
    // GIVEN
    const stack = new Stack();

    // WHEN
    new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        static: {
          ip: '192.0.2.1',
          staticRoutes: [
            '192.168.10.0/24',
            '192.168.20.0/24'
          ]
        }
      }
    });

    // THEN
    expect(stack).to(haveResource('AWS::EC2::VPNConnection', {
      CustomerGatewayId: {
        Ref: 'VpcNetworkstaticCustomerGatewayAF2651CC'
      },
      Type: 'ipsec.1',
      VpnGatewayId: {
        Ref: 'VpcNetworkVpnGateway501295FA'
      },
      StaticRoutesOnly: true,
    }));

    expect(stack).to(haveResource('AWS::EC2::VPNConnectionRoute', {
      DestinationCidrBlock: '192.168.10.0/24',
      VpnConnectionId: {
        Ref: 'VpcNetworkstaticE33EA98C'
      }
    }));

    expect(stack).to(haveResource('AWS::EC2::VPNConnectionRoute', {
      DestinationCidrBlock: '192.168.20.0/24',
      VpnConnectionId: {
        Ref: 'VpcNetworkstaticE33EA98C'
      }
    }));

    test.done();
  },

  'with tunnel options'(test: Test) {
    // GIVEN
    const stack = new Stack();

    new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.1',
          tunnelOptions: [
            {
              preSharedKey: 'secretkey1234',
              tunnelInsideCidr: '169.254.10.0/30'
            }
          ]
        }
      }
    });

    expect(stack).to(haveResource('AWS::EC2::VPNConnection', {
      CustomerGatewayId: {
        Ref: 'VpcNetworkVpnConnectionCustomerGateway8B56D9AF'
      },
      Type: 'ipsec.1',
      VpnGatewayId: {
        Ref: 'VpcNetworkVpnGateway501295FA'
      },
      StaticRoutesOnly: false,
      VpnTunnelOptionsSpecifications: [
        {
          PreSharedKey: 'secretkey1234',
          TunnelInsideCidr: '169.254.10.0/30'
        }
      ]
    }));

    test.done();
  },

  'fails when vpc has no vpn gateway'(test: Test) {
    // GIVEN
    const stack = new Stack();

    const vpc = new VpcNetwork(stack, 'VpcNetwork');

    test.throws(() => vpc.addVpnConnection('VpnConnection', {
      asn: 65000,
      ip: '192.0.2.1'
    }), /VPN gateway/);

    test.done();
  },

  'fails when ip is invalid'(test: Test) {
    // GIVEN
    const stack = new Stack();

    test.throws(() => new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.256'
        }
      }
    }), /`ip`.+IPv4/);

    test.done();
  },

  'fails when specifying more than two tunnel options'(test: Test) {
    // GIVEN
    const stack = new Stack();

    test.throws(() => new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.1',
          tunnelOptions: [
            {
              preSharedKey: 'secretkey1234',
            },
            {
              preSharedKey: 'secretkey1234',
            },
            {
              preSharedKey: 'secretkey1234',
            }
          ]
        }
      }
    }), /two.+`tunnelOptions`/);

    test.done();
  },

  'fails with duplicate tunnel inside cidr'(test: Test) {
    // GIVEN
    const stack = new Stack();

    test.throws(() => new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.1',
          tunnelOptions: [
            {
              tunnelInsideCidr: '169.254.10.0/30',
            },
            {
              tunnelInsideCidr: '169.254.10.0/30',
            }
          ]
        }
      }
    }), /`tunnelInsideCidr`.+both tunnels/);

    test.done();
  },

  'fails when specifying an invalid pre-shared key'(test: Test) {
    // GIVEN
    const stack = new Stack();

    test.throws(() => new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.1',
          tunnelOptions: [
            {
              preSharedKey: '0invalid',
            }
          ]
        }
      }
    }), /`preSharedKey`/);

    test.done();
  },

  'fails when specifying a reserved tunnel inside cidr'(test: Test) {
    // GIVEN
    const stack = new Stack();

    test.throws(() => new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.1',
          tunnelOptions: [
            {
              tunnelInsideCidr: '169.254.1.0/30',
            }
          ]
        }
      }
    }), /`tunnelInsideCidr`.+reserved/);

    test.done();
  },

  'fails when specifying an invalid tunnel inside cidr'(test: Test) {
    // GIVEN
    const stack = new Stack();

    test.throws(() => new VpcNetwork(stack, 'VpcNetwork', {
      vpnConnections: {
        VpnConnection: {
          ip: '192.0.2.1',
          tunnelOptions: [
            {
              tunnelInsideCidr: '169.200.10.0/30',
            }
          ]
        }
      }
    }), /`tunnelInsideCidr`.+size/);

    test.done();
  }
};
